import {useState} from "../react/Hooks";

interface DogItemProps {
    readonly src: string;
    readonly index: number;
    readonly onDelete: (index: number) => void;
}

export const DogItem = ({src, onDelete, index}: DogItemProps) => {
    return (
        <img className={"image"} key={src} src={src} onClick={() => onDelete(index)}/>
    );
}

export const DogList = () => {
    const [dogs, setDogs] = useState<string[]>([]);

    const fetchDog = async () => {
        try {
            const response = await fetch("https://dog.ceo/api/breeds/image/random");
            const newDog = await response.json();
            setDogs((dogs) => [...dogs, newDog.message]);
        } catch (error) {
            console.error(error);
        }
    }

    const onDeleteDog = (index: number) => {
        setDogs((dogs) => dogs.filter((_, idx) => index !== idx));
    }


    return (
        <div>
            <h1>!!! Best Site Ever !!!</h1>
            <img className={"button"} src={"bunny.gif"} onClick={fetchDog}>More Dogs</img>
            <ul>
                {dogs.map((dog, index) => <DogItem key={dog} src={dog} index={index} onDelete={onDeleteDog}/>)}
            </ul>
        </div>
    );
}
